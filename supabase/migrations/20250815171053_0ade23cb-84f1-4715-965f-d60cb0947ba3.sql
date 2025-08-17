-- Fix malformed client data step by step
UPDATE clients 
SET 
  first_name = 'Peter',
  last_name = 'Levin',
  email = 'peter.levin.colorado@gmail.com'
WHERE email = 'Peter Levin <peter.levin.colorado@gmail.com>';

UPDATE clients 
SET 
  first_name = 'Leonid',
  last_name = 'Alaev',
  email = 'leonid.alaev@gmail.com'
WHERE email = 'Leonid Alaev <leonid.alaev@gmail.com>';

UPDATE clients 
SET 
  first_name = 'Tamara',
  last_name = 'Osgood',
  email = 'tamaraeosgood@gmail.com'
WHERE email = 'Tamara Osgood <tamaraeosgood@gmail.com>';

UPDATE clients 
SET 
  first_name = 'Leon',
  last_name = 'Landver',
  email = 'leon@mlco.us'
WHERE email = 'Leon Landver <leon@mlco.us>';

UPDATE clients 
SET 
  first_name = 'Brydon',
  last_name = 'March',
  email = 'brydonmarch@gmail.com'
WHERE email = 'Brydon March <brydonmarch@gmail.com>';

UPDATE clients 
SET 
  first_name = 'Angela',
  last_name = 'Hewitt',
  email = 'angelahewitt7@gmail.com'
WHERE email = 'Angela Hewitt <angelahewitt7@gmail.com>';

UPDATE clients 
SET 
  first_name = 'Katisha',
  last_name = 'Freeman',
  email = 'katisha@experiencetheeot.com'
WHERE email = 'Katisha Freeman <katisha@experiencetheeot.com>';

UPDATE clients 
SET 
  first_name = 'Weerayuth',
  last_name = 'Juneweeranong',
  email = 'yuthhh@gmail.com'
WHERE email = 'weerayuth juneweeranong <yuthhh@gmail.com>';

UPDATE clients 
SET 
  first_name = 'Silvana',
  last_name = 'Vitorino'
WHERE email = 'silvanavitorino@hotmail.com';

UPDATE clients 
SET 
  first_name = 'Awel',
  last_name = 'Muna'
WHERE email = 'awelmuna629@gmail.com';